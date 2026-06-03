import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          color: 'var(--text-primary, #333)'
        }}>
          <h2>Something went wrong loading this page.</h2>
          <p style={{ color: 'var(--text-muted, #666)' }}>
            We've encountered an unexpected error. Please try refreshing the page or navigating back.
          </p>
          <button 
            onClick={() => {
              this.setState({ hasError: false });
              window.location.hash = '/';
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: 'var(--accent-blue, #007bff)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Home
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
