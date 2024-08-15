const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;
const ClientID = process.env.CLIENT_ID;
const ClientSecret = process.env.CLIENT_SECRET;
const RefreshToken = process.env.REFRESH_TOKEN;
const Redirect_URI = process.env.REDIRECT_URI;









// Use CORS middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Adjust the limit as needed
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));






// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));






// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });






//Define MongoDB Schema for Admin
const adminSchema = new mongoose.Schema({
  email: {type:String, required:true, unique:true},
  password: { type: String, required:true },
});
const Admin = mongoose.model('Admin', adminSchema);








// Define MongoDB Schema for Media
const mediaSchema = new mongoose.Schema({
  url: String,
  type: String,
});

const Media = mongoose.model('Media', mediaSchema);

// Route to handle media upload
app.post('/api/media', upload.single('file'), async (req, res) => {
  try {
    const { filename, mimetype } = req.file;
    const filePath = `uploads/${filename}`;

    const newMedia = new Media({
      url: filePath,
      type: mimetype,
    });

    const savedMedia = await newMedia.save();
    res.status(201).json(savedMedia);
  } catch (err) {
    //console.error('Error saving media:', err);
    res.status(500).send('Server Error');
  }
});




// Route to handle media deletion
app.delete('/api/media/:url', async (req, res) => {
  try {
    const url = decodeURIComponent(req.params.url);
    await Media.findOneAndDelete({ url });
    res.status(204).end();
  } catch (err) {
    //console.error('Error deleting media:', err);
    res.status(500).send('Server Error');
  }
});

// Route to fetch all media items
app.get('/api/media', async (req, res) => {
  try {
    const mediaItems = await Media.find();
    res.status(200).json(mediaItems);
  } catch (err) {
    //console.error('Error fetching media:', err);
    res.status(500).send('Server Error');
  }
});





// Define MongoDB Schema for Attendance
const attendanceSchema = new mongoose.Schema({
  name: String,
  status: String,
  date: Date,
});

const Attendance = mongoose.model('Attendance', attendanceSchema);







// Express middleware to parse JSON bodies
app.use(express.json());





const ForAttendanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const ForAttendance = mongoose.model('ForAttendance', ForAttendanceSchema);



// Route to add student name to ForAttendance
app.post('/api/forattendances', async (req, res) => {
  try {
    const { name } = req.body;
    const newAttendance = new ForAttendance({ name });
    await newAttendance.save();
    res.status(201).json(newAttendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});





// Route to fetch all students for attendance
app.get('/api/forattendances', async (req, res) => {
  try {
    const students = await ForAttendance.find();
    res.json(students);
  } catch (err) {
    //console.error('Error fetching students:', err);
    res.status(500).send('Server Error');
  }
});




const RemovedStudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  removedAt: { type: Date, default: Date.now },
});

const RemovedStudent = mongoose.model('RemovedStudent', RemovedStudentSchema);



// Route to delete a student by ID from the ForAttendance collection
app.delete('/api/forattendances/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const student = await ForAttendance.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const removedStudent = new RemovedStudent({ name: student.name});
    await removedStudent.save();
    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});



// Route to save attendance records
app.post('/api/attendance', async (req, res) => {
  try {
    const attendanceRecords = req.body;
    await Attendance.insertMany(attendanceRecords);
    res.status(200).send('Attendance records saved successfully.');
  } catch (err) {
    //console.error('Error saving attendance records:', err);
    res.status(500).send('Server Error');
  }
});






// Retrieve Attendance
app.get('/api/attendance/:date', async (req, res) => {
  try {
    const date = req.params.date;
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const attendanceData = await Attendance.find({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    res.status(200).json(attendanceData);
  } catch (err) {
   // console.error('Error fetching attendance:', err);
    res.status(500).send('Server Error');
  }
});







// Helper function to generate studentId
const generateStudentId = async () => {
  const currentYear = new Date().getFullYear().toString().slice(-2); // Get last two digits of the year
  const prefix = "KSC"; // Prefix for Shotokan Karate Do Association
  const middle = "Student";

  const lastStudent = await Student.findOne().sort({ studentId: -1 }).exec();

  //console.log("Last student:", lastStudent); // Debugging log

  let studentNumber = 1;
  if (lastStudent && lastStudent.studentId) {
    const lastStudentId = lastStudent.studentId;
    const match = lastStudentId.match(/\d{4}$/); // Extract last 4 digits
    if (match) {
      const lastStudentNumber = parseInt(match[0], 10);
      //console.log("Last student number:", lastStudentNumber); // Debugging log
      if (!isNaN(lastStudentNumber)) {
        studentNumber = lastStudentNumber + 1;
      }
    }
  }

  const newStudentId = `${prefix}${currentYear}${middle}${String(studentNumber).padStart(4, '0')}`;
  //console.log("New student ID:", newStudentId); // Debugging log

  return newStudentId;
};







// oauth2 setup for mail transfer
const oAuth2Client = new google.auth.OAuth2(ClientID, ClientSecret, Redirect_URI)
oAuth2Client.setCredentials({ refresh_token:RefreshToken})

async function getAccessToken() {
  try {
    const { token } = await OAuth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}










const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  studentId:String,
  aadhaarNo: { type: String, required: true },
  aadhaarImage: { type: String, required: true },
  studentImage: { type: String, required: true },
  mobileNo: { type: String, required: true },
  email: { type: String, required: true },
  fatherName: { type: String, required: true },
  fatherOccupation: { type: String, required: true },
  motherName: { type: String, required: true },
  motherOccupation: { type: String, required: true },
  address: { type: String, required: true },
  qualification: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  sex: { type: String, required: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  dateOfJoining: { type: Date, required: true },
  contactNo: { type: String, required: true },
  dojoName: { type: String, required: true },
  remarks: { type: String },
  instructorName: { type: String, required: true },
  chiefInstructorName: { type: String, required: true },
  certificate: { type: String },
});


const Student = mongoose.model('Student', studentSchema);







// Route to handle student registration
app.post('/api/students', upload.fields([{ name: 'aadhaarImage', maxCount: 1 }, { name: 'studentImage', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, password, aadhaarNo, mobileNo, email,fatherName,fatherOccupation,motherName,motherOccupation,address, qualification,dateOfBirth,sex,weight,height,dateOfJoining,contactNo,dojoName,remarks,instructorName,chiefInstructorName } = req.body;
    const aadhaarImagePath = req.files['aadhaarImage'][0].path;
    const studentImagePath = req.files['studentImage'][0].path;
    


    const studentId = await generateStudentId();
    
   // const hashedStudentId = await bcrypt.hash('studeetId, 10');

    //Hash adharno and password
    const hashedAadharNo = await bcrypt.hash(aadhaarNo, 10);
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      name,
      studentId,
      password:hashedPassword,
      
      aadhaarNo:hashedAadharNo,
      aadhaarImage: aadhaarImagePath,
      studentImage: studentImagePath,
      mobileNo,
      
      email,
      fatherName,
      fatherOccupation,
      motherName,
      motherOccupation,
      address,
      qualification,
      dateOfBirth,
      sex,
      weight,
      height,
      dateOfJoining,
      contactNo,
      dojoName,
      remarks,
      instructorName,
      chiefInstructorName,
    
    });

    const savedStudent = await newStudent.save();
    res.json(newStudent);
    //console.log('student saved');
   


    // Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    
    user: 'shotokankaratehubli@gmail.com',
    pass: process.env.APP_PASSWORD,
  },
});
    



    const mailOptions = {
      from: '"Shotokan Karate Do Association" <shotokankaratehubli@gmail.com>',
      to: email,
      subject: 'Welcome to Shotokan Karate Do Association, Unkal, Hubli',
      text: `Dear ${name},\n\nThank you for registering with Shotokan Karate Do Association, Unkal, Hubli.\n\nYour registration details:\nStudent ID: ${studentId}\nPassword: ${password}\n\nWe look forward to seeing you!\n\nBest regards,\nShotokan Karate Do Association\n\nIf you did not register for this, please ignore this email.\nTo unsubscribe from these emails, please reply to this email with "UNSUBSCRIBE".`,
      html: `<p>Dear ${name},</p>
             <p>Thank you for registering with Shotokan Karate Do Association, Unkal, Hubli.</p>
             <p>Your registration details:</p>
             <ul>
               <li>Student ID: ${studentId}</li>
               <li>Password: ${password}</li>
             </ul>
             <p>We look forward to seeing you!</p>
             <p>Best regards,<br>Shotokan Karate Do Association</p>
             <p>If you did not register for this, please ignore this email.</p>
             <p>To unsubscribe from these emails, please reply to this email with "UNSUBSCRIBE".</p>`,
      
             
          
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    //res.status(201).json(savedStudent);
  } catch (err) {
    //console.error('Error saving student:', err);
    res.status(500).send('Server Error');
  }
});








//Route to authenticate Admin

const JWT_SECRET = process.env.JWT_SECRET;
console.log(JWT_SECRET);
app.post('/api/admins/login', async (req, res) =>{
  const {email, password} = req.body;

  try {
    const admin = await Admin.findOne({ email });
    
    if(!admin) {
      return res.status(404).json({error: 'Invalid Admin credentials'});

    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if(!isMatch) {
      return res.status(404).json({error: 'Invalid Admin credentials' });
    }
    const token = jwt.sign({id:admin._id}, JWT_SECRET, {expiresIn: '1h'});
    res.status(200).json({token});
  }catch(err){
    //console.error('Error logging in admin:', err);
    res.status(500).send('server Error');
  }
});







//Route to authenticate student
app.post('/api/students/login', async (req, res) => {
  const { studentId, password } = req.body;

  try {
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(404).json({ error: 'Invalid student ID or password' });
    }

    const isMatched = await bcrypt.compare(password, student.password);
    if (!isMatched) {
      return res.status(404).json({ error: 'Invalid student credentials' });
    }

    const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '1h' });

    // Fetch attendance records for the student grouped by month
    const attendanceRecords = await Attendance.aggregate([
      { $match: { name: student.name } },
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          records: { $push: "$$ROOT" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // construct the student details object to return
    const studentDetails = {
      _id: student._id,
      name: student.name,
      studentId: student.studentId,
      mobileNo: student.mobileNo,
      parentsDetails: student.parentDetails,
      email: student.email,
      imageUrl: student.studentImage,  // Make sure this field is available in your Student schema
      attendance: attendanceRecords,
    };

    res.status(200).json({ token, studentDetails });
  }
  catch (err) {
    //console.error('Error logging in student:', err);
    res.status(500).send('Server Error');
  }
});








// Fetch student names from the attendances database
app.get('/api/attendances', async (req, res) => {
  try {
    const attendances = await Attendance.find(); // Fetch only the 'name' field
    res.json(attendances);
  } catch (err) {
    //console.error('Error fetching attendance names:', err);
    res.status(500).send('Server Error');
  }
});





// Remove student
app.delete('/api/attendances/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Attendance.findById(studentId);

    if(student) 
    {
      const removedStudent = new RemovedStudent({
        name:student.name,
        status:student.status,
        date:student.date,
        
      });

      await removedStudent.save();
      await Attendance.findByIdAndDelete(studentId);
      res.status(204).send('Student deleted');
    }

    
  } catch (err) {
    //console.error('Error deleting student:', err);
    res.status(500).send('Server Error');
  }
});

//Route to fetch all removed students

app.get('/api/removedstudents', async (req, res) => {
  try {
     const removedStudents = await RemovedStudent.find();
     res.json(removedStudents);
  }
  catch (err) {
    console.error('Error fetching removed students: ', err);
    res.status(500).send('Server Error');
  }
});

// Route to add back a removed student to the ForAttendance collection
app.post('/api/removedstudents/addback/:id', async (req, res) => {
  try {
    const removedStudentId = req.params.id;

    if (!removedStudentId) {
      return res.status(400).send('Invalid student ID');
    }

    // Find the removed student by ID
    const removedStudent = await RemovedStudent.findById(removedStudentId);
    if (!removedStudent) {
      return res.status(404).send('Removed student not found');
    }

    // Create a new student entry in the ForAttendance collection
    const newAttendance = new ForAttendance({
      name: removedStudent.name,
    });

    await newAttendance.save();
    await RemovedStudent.findByIdAndDelete(removedStudentId);

    res.status(200).json({ message: 'Student added back to attendance list successfully' });
  } catch (err) {
    //console.error('Error adding back student:', err);
    res.status(500).send('Server Error');
  }
});




//Route to authenticate Admin

const JWT_SECRET1 = process.env.JWT_SECRET;
console.log(JWT_SECRET1);
app.post('/api/admins/login', async (req, res) =>{
  const {email, password} = req.body;

  try {
    const admin = await Admin.findOne({ email });
    
    if(!admin) {
      return res.status(404).json({error: 'Invalid Admin credentials'});

    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if(!isMatch) {
      return res.status(404).json({error: 'Invalid Admin credentials' });
    }
    const token = jwt.sign({id:admin._id}, JWT_SECRET, {expiresIn: '1h'});
    res.status(200).json({token});
  }catch(err){
    console.error('Error logging in admin:', err);
    res.status(500).send('server Error');
  }
});




//Route to authenticate student
app.post('/api/students/login', async (req, res) => {
  const { studentId, password } = req.body;

  try {
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(404).json({ error: 'Invalid student ID or password' });
    }

    const isMatched = await bcrypt.compare(password, student.password);
    if (!isMatched) {
      return res.status(404).json({ error: 'Invalid student credentials' });
    }

    const token = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '1h' });

    // Fetch attendance records for the student grouped by month
    const attendanceRecords = await Attendance.aggregate([
      { $match: { name: student.name } },
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          records: { $push: "$$ROOT" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // construct the student details object to return
    const studentDetails = {
      _id: student._id,
      name: student.name,
      studentId: student.studentId,
      mobileNo: student.mobileNo,
      parentsDetails: student.parentDetails,
      email: student.email,
      imageUrl: student.studentImage,  // Make sure this field is available in your Student schema
      attendance: attendanceRecords,
    };

    res.status(200).json({ token, studentDetails });
  }
  catch (err) {
    console.error('Error logging in student:', err);
    res.status(500).send('Server Error');
  }
});








// Route to send email to all students
app.post('/api/students/send-email', async (req,res) => {
  try {
    const { subject, text } = req.body;
    
    const students = await Student.find();

    //Extracts all the email addresses
    const emailAddresses = students.map(student => student.email);

    //send email to each student

    const mailOptions = {
      from:'"Shtotokan karate Do Association youth sports club, hubballi" <shotokankaratehubli@gmail.com' ,
      to: emailAddresses,
      subject: subject,
      text:text
    };

        // Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    
    user: 'shotokankaratehubli@gmail.com',
    pass: process.env.APP_PASSWORD,
  },
});
    

    transporter.sendMail(mailOptions, (error, info) =>{
    if(error) {
      console.error('Error sending email', error);
      res.status(500).send('Error sending email');
    } else {
      console.log('Email sent:', info.response);
      res.status(200).send('Emails sent successfully');
    }
  } );
  }catch (err) {
    console.error('Error sending emails:', err);
    res.status(500).send('Server Error');
  }
});



const CertificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  pdfData: { type: String, required: true },
});

const Certificate = mongoose.model('Certificate', CertificateSchema);







// Route to save certificate
app.post('/api/certificates', async (req, res) => {
  try {
    const { studentId, pdfData } = req.body;
    const newCertificate = new Certificate({ studentId, pdfData });
    await newCertificate.save();
    res.status(201).json(newCertificate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Route to send certificate email
app.post('/api/certificatesmail', async (req, res) => {
  try {
    const { email, pdfData } = req.body;

    


    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Your Certificate of Enrollment',
      text: 'Please find attached your certificate of enrollment.',
      attachments: [
        {
          filename: 'certificate.pdf',
          content: pdfData,
          encoding: 'base64',
        },
      ],
    };

    // Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    
    user: 'shotokankaratehubli@gmail.com',
    pass: process.env.APP_PASSWORD,
  },
});

    

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(200).json({ message: 'Email sent: ' + info.response });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const eventSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  mimetype: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});


const Event = mongoose.model('Event', eventSchema);

app.post('/api/add-event', upload.single('image'), async (req, res) => {
  try {
    const { description } = req.body;
    const { path, mimetype } = req.file; // Get file path and MIME type
    const event = new Event({
      imageUrl: path,
      mimetype,
      description,
    });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add event' });
  }
});


//Retrieve Event
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find({});
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});







// Define MongoDB Schema for Media
const mediaSchema1 = new mongoose.Schema({
  url: String,
  type: String,
});

const Media1 = mongoose.model('Media1', mediaSchema);

// Route to handle media upload
app.post('/api/media1', upload.single('file'), async (req, res) => {
  try {
    const { filename, mimetype } = req.file;
    const filePath = `uploads/${filename}`;

    const newMedia1 = new Media1({
      url: filePath,
      type: mimetype,
    });

    const savedMedia1 = await newMedia1.save();
    res.status(201).json(savedMedia1);
  } catch (err) {
    //console.error('Error saving media:', err);
    res.status(500).send('Server Error');
  }
});






// Route to fetch all media items
app.get('/api/media1', async (req, res) => {
  try {
    const mediaItems = await Media1.find();
    res.status(200).json(mediaItems);
  } catch (err) {
    //console.error('Error fetching media:', err);
    res.status(500).send('Server Error');
  }
});






// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
