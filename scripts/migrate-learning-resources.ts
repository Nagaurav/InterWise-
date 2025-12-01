import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Interview from "../models/Interview";

interface LearningResource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'course' | 'documentation' | 'tutorial' | 'forum';
  description: string;
}

type LearningResources = {
  [key: string]: LearningResource[];
};

async function migrateLearningResources() {
  try {
    await connectDB();
    console.log("Connected to database");

    const interviews = await Interview.find({
      "feedback.learningResources": { $exists: true }
    });

    console.log(`Found ${interviews.length} interviews to migrate`);

    let migratedCount = 0;
    for (const interview of interviews) {
      const feedback = interview.feedback as any;
      
      if (feedback?.learningResources) {
        let resourcesToSave: LearningResources = {};
        
        if (feedback.learningResources instanceof Map) {
          // Convert Map to plain object
          (feedback.learningResources as Map<string, LearningResource[]>).forEach((value, key) => {
            resourcesToSave[key] = value;
          });
        } else if (typeof feedback.learningResources === 'object') {
          // If it's already an object but might need validation
          resourcesToSave = feedback.learningResources;
        }
        
        // Validate and clean each resource
        for (const [topic, resources] of Object.entries(resourcesToSave)) {
          if (Array.isArray(resources)) {
            resourcesToSave[topic] = resources.filter(resource => 
              resource && 
              typeof resource.title === 'string' && 
              typeof resource.url === 'string' &&
              ['article', 'video', 'course', 'documentation', 'tutorial', 'forum'].includes(resource.type) &&
              typeof resource.description === 'string'
            );
          }
        }

        // Update the interview
        await Interview.updateOne(
          { _id: interview._id },
          { $set: { "feedback.learningResources": resourcesToSave } }
        );
        migratedCount++;
        console.log(`Migrated interview ${interview._id}`);
      }
    }

    console.log(`Migration completed successfully. Migrated ${migratedCount} interviews.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateLearningResources();