const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const Hod = require('./models/hodSchema'); // Import HodSchema
const HodAssign = require('./models/hodAssignSchema'); // Import hodAssignSchema
const Coordi = require('./models/CoordinatorSchema'); // Import CoordinatorRegSchema

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/QuestionPaperTracking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Set up view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../src/public/views')); // Adjusted path for views
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory
app.use('/css', express.static(path.join(__dirname, '../src/public/views/css')));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'your_secret_here', resave: false, saveUninitialized: true }));


const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });
  const upload = multer({ storage: storage });

// Middleware for authentication and checking if user is authenticated
const isAuthenticated = (req, res, next) => req.session && req.session.user ? next() : res.redirect('/home');

// Generate Ethereal test account
const etherealAccount = {
    user: 'ali.brown30@ethereal.email',
    pass: '2e1C3fVV1tcbF8NYEc'
};

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: etherealAccount,
});

// Routes
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/hodLogin', (req, res) => {
    res.render('hodLogin'); // Render the HOD login form
});

app.get('/hodReg', (req, res) => {
    res.render('hodReg');
});

app.get('/teacherLogin', (req, res) => {
    res.render('teacherLogin');
});

app.get('/teacher2FA', (req, res) => {
    res.render('teacher2FA');
});

app.post('/teacher2FA', async (req, res) => {
    const { email } = req.body;
    try {

        console.log(`Attempting to find teacher with email: ${email}`); // Log email being searched

        const existingTeacher = await HodAssign.findOne({ teacherEmail: email });

        console.log(`Found teacher: ${existingTeacher}`); // Log found teacher

        if (!existingTeacher) {
            return res.status(400).send('Teacher with this email does not exist');
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit OTP
        existingTeacher.otp = otp; // Save OTP to the existing teacher record
        await existingTeacher.save();

        console.log(`Generated OTP for ${email}: ${otp}`); // Log OTP to console for testing

        await transporter.sendMail({
            from: etherealAccount.user,
            to: email,
            subject: 'Your OTP for 2FA',
            text: `Your OTP for 2FA is: ${otp}`
        });

        res.redirect(`/teacherAuthCode?email=${email}`); // Redirect to Authentication Code page with email as query param
    } catch (error) {
        console.error('Error in 2FA process:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/teacherAuthCode', (req, res) => {
    const { email } = req.query;
    res.render('teacherAuthCode', { email });
});

app.post('/teacherAuthCode', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const teacher = await HodAssign.findOne({ otp: code });
        if (!teacher) {
            return res.status(400).send('Invalid OTP');
        }

        teacher.teacherPassword = newPassword; // Update password
        teacher.otp = null; // Clear OTP after successful password reset
        await teacher.save();

        res.redirect('/teacherLogin'); // Redirect to teacher login page
    } catch (error) {
        console.error('Error verifying OTP and setting new password:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/uploadQuestionPaper', isAuthenticated, upload.single('questionPaper'), async (req, res) => {
    const { teacherEmail, teacherDepartment, semester, year } = req.session.user;
    const questionPaperPath = req.file.path;
  
    try {
      const hodAssign = await HodAssign.findOneAndUpdate(
        { teacherEmail, teacherDepartment, semester, year },
        { $set: { questionPaper: questionPaperPath, submissionStatus: 'Question Paper Submitted' } },
        { new: true }
      );
  
      if (!hodAssign) {
        return res.status(404).send('Teacher not found');
      }
  
      req.session.successMessage = 'Question Paper uploaded successfully';
      res.redirect('/');
    } catch (error) {
      console.error('Error uploading question paper:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  app.get('/', (req, res) => {
    const successMessage = req.session.successMessage;
    req.session.successMessage = null; // Clear the success message after displaying it
    res.render('home', { successMessage });
  });

app.post('/hodReg', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingHod = await Hod.findOne({ email });
        if (existingHod) {
            return res.status(400).send('HOD with this email already exists');
        }
        const newHod = new Hod({ name, email, password });
        await newHod.save();
        res.redirect('/hodLogin'); // Redirect to HOD login page after successful registration
    } catch (error) {
        console.error('Error registering HOD:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/hodLogin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hod = await Hod.findOne({ email, password });
        if (!hod) {
            return res.status(401).send('Invalid credentials');
        }
        req.session.user = hod;
        res.redirect('/hodAssign'); // Redirect to HOD dashboard after successful login
    } catch (error) {
        console.error('Error logging in HOD:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/hodAssign', isAuthenticated, (req, res) => {
    res.render('hodAssign');
});

// POST route for assigning faculties and sending reset password link
app.post('/hodAssign', isAuthenticated, async (req, res) => {
    const { teacherName, teacherEmail, teacherPassword, teacherDepartment, semester, year } = req.body;
    try {
        // Check if faculty assignment already exists
        const existingAssignment = await HodAssign.findOne({ teacherEmail, teacherDepartment, semester, year });
        if (existingAssignment) {
            return res.status(400).send('Faculty assignment already exists');
        }

        // Save faculty assignment to MongoDB
        const newTeacherAssignment = new HodAssign({ teacherName, teacherEmail, teacherPassword, teacherDepartment, semester, year });
        await newTeacherAssignment.save();

        // Generate reset password link
        const resetPasswordLink = `http://127.0.0.1:3000/teacherAuthCode`;

        // Send email with reset password link
        await transporter.sendMail({
            from: etherealAccount.user, // Your generated Ethereal email
            to: teacherEmail, // Recipient's email
            subject: 'Reset Password Link',
            text: `Click the following link to reset your password: ${resetPasswordLink}`
        });

        // Redirect after successful form processing
        res.redirect('/');
    } catch (error) {
        console.error('Error assigning faculty:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Teacher login route
app.post('/teacherLogin', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if the teacher exists in the hodAssign collection
        const teacher = await HodAssign.findOne({ teacherEmail: email, teacherPassword: password });
        if (!teacher) {
            return res.status(401).send('Invalid credentials');
        }
        // Set session data for the authenticated teacher
        req.session.user = teacher;
        res.redirect('/teacherDash'); // Redirect to teacher dashboard after successful login
    } catch (error) {
        console.error('Error logging in Teacher:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Teacher dashboard route
app.get('/teacherDash', isAuthenticated, async (req, res) => {
    try {
        // Retrieve teacher's information from session
        const teacherInfo = req.session.user;
        
        // Render the teacher dashboard template and pass the teacher's information
        res.render('teacherDash', { teacherInfo });
    } catch (error) {
        console.error('Error rendering teacher dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/CoordinatorLogin', (req, res) => {
    res.render('CoordinatorLogin'); // Render the Coordinator login form
});

app.get('/CoordinatorReg', (req, res) => {
    res.render('CoordinatorReg');
});

app.get('/CoordinatorDash', isAuthenticated, (req, res) => {
    res.render('CoordinatorDash');
});
  
app.post('/CoordinatorReg', async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const existingCoordinator = await Coordi.findOne({ email });
      if (existingCoordinator) {
        return res.status(400).send('Coordinator with this email already exists');
      }
      const newCoordinator = new Coordi({ name, email, password });
      await newCoordinator.save();
      res.redirect('/CoordinatorLogin');
    } catch (error) {
      console.error('Error registering Coordinator:', error);
      res.status(500).send('Internal Server Error');
    }
});
  
app.post('/CoordinatorLogin', async (req, res) => {
    const { email, password } = req.body;
    try {
      const Coor = await Coordi.findOne({ email, password });
      if (!Coor) {
        return res.status(401).send('Invalid credentials');
      }
      req.session.user = Coor;
      res.redirect('/CoordinatorDash');
    } catch (error) {
      console.error('Error logging in Coordinator:', error);
      res.status(500).send('Internal Server Error');
    }
});

// CoordinatorDash route
app.get('/CoordinatorDash', isAuthenticated, async (req, res) => {
    try {
        const hodAssigns = await HodAssign.find();
        console.log("Retrieved hodAssign:", hodAssigns)
        res.render("CoordinatorDash", { hodAssigns });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// Define a route to handle POST request to /checkSubmission
app.post('/checkSubmission', isAuthenticated, async (req, res) => {
    const { teacherEmail } = req.body;
    const isChecked = req.body.isChecked ? 'Submitted' : 'Not Submitted';

    try {
        await HodAssign.findOneAndUpdate(
            { teacherEmail },
            { submissionStatus: isChecked }
        );
        res.redirect('/CoordinatorDash');
    } catch (error) {
        console.error('Error updating submission status:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Define a route to handle the GET request to /home
app.get('/home', isAuthenticated, (req, res) => {
    // Render the home page or any other content you want to display
    res.render('home');
});


// Error handling middleware
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => console.log(`Server is running at PORT: ${port}`));
