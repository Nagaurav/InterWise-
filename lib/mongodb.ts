import mongoose from "mongoose";
import dns from "dns";

// On some Windows setups Node can't read the system DNS config and falls back to 127.0.0.1,
// so the SRV lookup that mongodb+srv:// URIs need fails (querySrv ECONNREFUSED).
// Use public DNS instead. Applied right before connecting, not at module load, because the
// bundler may evaluate this module separately from the code that performs the lookup.
const PUBLIC_DNS = ["8.8.8.8", "1.1.1.1"];
const usePublicDns = () => {
  dns.setServers(PUBLIC_DNS);
  dns.promises.setServers(PUBLIC_DNS);
};

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  throw new Error("Missing MONGODB_URI environment variable");
}

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) {
      console.log("MongoDB connection already established");
      return;
    }

    // Only SRV URIs need the DNS workaround; the standard mongodb:// form uses normal host lookups
    if (MONGO_URI.startsWith("mongodb+srv://")) usePublicDns();
    await mongoose.connect(MONGO_URI, {
      dbName: "interview-ai",
    });

    console.log("mongodb connected successfully");
  } catch (error) {
    console.error("mongodb conncetion error:", error);
    // Don't process.exit here: in a Next.js server it kills the whole dev server
    throw error;
  }
};
