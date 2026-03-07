export default function NotFound() {
  return (
    <html>
      <body>
        <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Page Not Found</h1>
          <p style={{ color: '#666' }}>Redirecting to home...</p>
          <script dangerouslySetInnerHTML={{
            __html: `window.location.href = '/';`
          }} />
        </div>
      </body>
    </html>
  )
}
