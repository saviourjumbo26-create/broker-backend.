const express = require('express');
const nodemailer = require('nodemailer');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Temporary memory to track customer verification codes
const activeOTPs = {};

// 1. Fetch live market price from official Crypto API
app.get('/api/bitcoin-price', async (req, res) => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
        const data = response.data.bitcoin;
        res.json({
            price: data.usd,
            change24h: data.usd_24h_change
        });
    } catch (error) {
        // Fallback pricing if API limits are temporarily hit
        res.json({ price: 94250.00, change24h: 1.42 });
    }
});

// 2. Generate security code and dispatch it to client's inbox
app.post('/api/request-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    // Generate a secure 6-digit pin code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Code stays valid for 5 minutes
    activeOTPs[email] = {
        code: otpCode,
        expires: Date.now() + 5 * 60 * 1000
    };

    // YOUR EMAIL NOTIFICATION CONFIGURATION
    const transporter = nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: 'saviourjumbo26@gmail.com', 
                pass: 'omgd zmwj bsbl hsaj'   // <-- REMEMBER TO PASTE YOUR 16-CHARACTER GOOGLE APP PASSWORD HERE
        }
    });

    const mailOptions = {
        from: '"Global Broker Escrow" <saviourjumbo26@gmail.com>',
        to: email,
        subject: 'Your Safe Verification Code',
        text: `Your verification code is: ${otpCode}. It expires in 5 minutes.`,
        html: `<div style="font-family:sans-serif;padding:20px;background:#181a20;color:#eaecef;border-radius:12px;">
                <h2 style="color:#f3ba2f;">Global Bitcoin Broker</h2>
                <p>You requested a secure trade verification code. Enter the code below on our interface:</p>
                <h1 style="background:#0b0e11;letter-spacing:5px;padding:15px;text-align:center;color:#f3ba2f;border-radius:8px;font-size:2rem;">${otpCode}</h1>
                <p style="color:#848e9c;font-size:0.85rem;">If you did not request this, please ignore this security safety prompt.</p>
               </div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP code sent successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Email setup failed. Please verify your Google App Password." });
    }
});

// 3. Verify security code entered by client
app.post('/api/verify-otp', (req, res) => {
    const { email, code } = req.body;
    const record = activeOTPs[email];

    if (!record) {
        return res.json({ success: false, message: "No verification process found or code expired." });
    }
    if (Date.now() > record.expires) {
        delete activeOTPs[email];
        return res.json({ success: false, message: "Verification code has expired." });
    }
    if (record.code !== code) {
        return res.json({ success: false, message: "Incorrect code. Try again." });
    }

    // Code matches perfectly! Clear tracker memory and authorize trade
    delete activeOTPs[email];
    res.json({ success: true, message: "Verification approved!" });
});

// Dynamic port mapping for cloud deployment services
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Broker backend server running online on port ${PORT}`));
