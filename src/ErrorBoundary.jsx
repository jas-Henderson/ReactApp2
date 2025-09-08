import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "monospace" }}>
          <h2>💥 App crashed</h2>
          <pre>{String(this.state.error?.message || this.state.error)}</pre>
          <p>See the browser console for a full stack trace.</p>
        </div>
      );
    }
    return this.props.children;
  }
}