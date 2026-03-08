import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../prisma';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

// Temporary mock for development since Redis isn't running on this machine
export const refundQueue = {
    add: async () => { console.log("Mock queue add called") }
} as unknown as Queue;

export const refundWorker = null;
