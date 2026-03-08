import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function test() {
    try {
        console.log('Testing with Key ID:', process.env.RAZORPAY_KEY_ID);
        const order = await razorpay.orders.create({
            amount: 100,
            currency: 'INR',
            receipt: 'test_receipt'
        });
        console.log('Order created successfully:', order.id);
    } catch (err) {
        console.error('Order creation failed:', err);
    }
}

test();
