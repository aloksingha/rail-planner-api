import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { seedCorridors } from './seed';

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Auto-seed corridor pricing rules (non-blocking)
    seedCorridors();
});