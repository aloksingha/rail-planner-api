import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
    migrate: {
        connection: {
            url: process.env.DATABASE_URL
        }
    }
});
