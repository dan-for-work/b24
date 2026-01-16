export async function fetchExecutions() {
  const res = await fetch("/.netlify/functions/logs");
  return res.json();
}