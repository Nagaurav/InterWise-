"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface InterviewStats {
  total: number;
  completed: number;
  inProgress: number;
}

const ProfilePage = () => {
  const { userData, isAuthenticated, authLoading, getToken } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const fetchStats = async () => {
      try {
        const token = await getToken();
        const response = await fetch("/api/interview/statistics", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch interview statistics");
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching interview statistics:", err);
        setError("Failed to load interview statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated, router, getToken, authLoading]);

  if (!isAuthenticated || !userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Profile</h1>
          
          <div className="bg-zinc-900 rounded-lg p-6 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-zinc-700 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {userData.name?.charAt(0).toUpperCase() || userData.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold">{userData.name || "User"}</h2>
                <p className="text-zinc-400">{userData.email}</p>
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-6">
              <h3 className="text-lg font-semibold mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Full Name
                  </label>
                  <div className="bg-zinc-800 rounded-md px-3 py-2">
                    {userData.name || "Not provided"}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <div className="bg-zinc-800 rounded-md px-3 py-2">
                    {userData.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Member Since
                  </label>
                  <div className="bg-zinc-800 rounded-md px-3 py-2">
                    Not available
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-700 pt-6">
              <h3 className="text-lg font-semibold mb-4">Interview Statistics</h3>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-zinc-800 rounded-md p-4 text-center animate-pulse">
                      <div className="h-8 w-12 bg-zinc-700 rounded mx-auto mb-2"></div>
                      <div className="h-4 w-16 bg-zinc-700 rounded mx-auto"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-zinc-800 rounded-md p-4 text-center text-red-400">
                  {error}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-800 rounded-md p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {stats?.total || 0}
                    </div>
                    <div className="text-sm text-zinc-400">Total Interviews</div>
                  </div>
                  <div className="bg-zinc-800 rounded-md p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {stats?.completed || 0}
                    </div>
                    <div className="text-sm text-zinc-400">Completed</div>
                  </div>
                  <div className="bg-zinc-800 rounded-md p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {stats?.inProgress || 0}
                    </div>
                    <div className="text-sm text-zinc-400">In Progress</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
