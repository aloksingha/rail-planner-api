import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import { seedCorridors } from './seed';
import { verifySMTP } from './services/notificationService';

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    // Auto-verify notifications & seed rules (non-blocking)
    verifySMTP();
    seedCorridors();
});