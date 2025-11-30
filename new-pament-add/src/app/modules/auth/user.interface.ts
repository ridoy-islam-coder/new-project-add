import { Document } from "mongoose";

export enum Role {
    USER = "user",
    ADMIN = "admin",
  
}

export interface IUser extends Document {
    name: string;
    email: string;
    phone: number;
    password: string;
    imgUrl: string;
    otp:string;
    role: Role;
    is_subscription: boolean;
    createdAt: Date;
    updatedAt: Date;
    
}