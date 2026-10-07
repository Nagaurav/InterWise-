// Shared score helpers for the results page (same thresholds as the dashboard cards)
export const scoreHex = (score: number) =>
  score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#fb7185";

export const scoreLabel = (score: number) => {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Satisfactory";
  if (score >= 50) return "Needs Improvement";
  return "Poor";
};
