export function ok(message) {
  return new Response(message, { status: 200 });
}

export function error(message, status = 500) {
  return new Response(message, { status });
}
