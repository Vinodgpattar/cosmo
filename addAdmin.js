const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const Admin = mongoose.model('Admin', adminSchema);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log('MongoDB connection error:', err));

const addAdmin = async () => {
    const email = process.env.ADMIN_EMAIL2;
    const password = process.env.ADMIN_PASSWORD2;

    if (!email || !password) {
        //console.error('Environment variables ADMIN_EMAIL and ADMIN_PASSWORD are required');
        return;
    }

    //console.log(`Admin Email: ${email}`);
    //console.log(`Admin Password: ${password}`);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
        email,
        password: hashedPassword,
    });

    try {
        await admin.save();
        console.log('Admin user added successfully');
    } catch (err) {
        console.error('Error adding admin user:', err.message);
    } finally {
        mongoose.connection.close();
    }
};

addAdmin();
