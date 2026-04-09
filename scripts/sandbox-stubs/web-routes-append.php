/**
 * Appended by scripts/bootstrap-laravel-sandbox.sh — response-trace-demo
 */
\Illuminate\Support\Facades\Route::middleware([
    \CodeToVisualization\ResponseTrace\Http\Middleware\ResponseTraceMiddleware::class,
])->get(
    '/trace-demo',
    static fn () => new \App\Http\Resources\DemoResource((object) ['noop' => true]),
);
