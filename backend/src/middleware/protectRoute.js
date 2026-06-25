import { requireAuth, clerkClient } from '@clerk/express';
import User from '../models/User.js';
import { upsertStreamUser } from '../lib/stream.js';

export const protectRoute = [
    requireAuth(),
    async(req, res, next) => {
        try {
            const clerkId = req.auth().userId;
            if(!clerkId) return res.status(401).json({message:"Unauthorized - invalid token"});

            let user = await User.findOne({clerkId});

            if (!user) {
                try {
                    console.log("User not found in DB, attempting JIT provisioning...");
                    const clerkUser = await clerkClient.users.getUser(clerkId);
                    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
                    const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
                    const profileImage = clerkUser.imageUrl;

                    user = await User.findOneAndUpdate(
                        { clerkId },
                        { email, name, profileImage },
                        { upsert: true, new: true }
                    );

                    await upsertStreamUser({
                        id: clerkId,
                        name,
                        image: profileImage,
                    });
                    console.log("JIT provisioning successful.");
                } catch (clerkErr) {
                    console.error("Error in JIT provisioning:", clerkErr);
                    return res.status(404).json({message:"User not found"});
                }
            }

            req.user = user;

            next();
        } catch (error) {
            console.error("Error in protectRoute middleware:", error);
            res.status(500).json({message:"Internal Server Error"});
        }
    }
]