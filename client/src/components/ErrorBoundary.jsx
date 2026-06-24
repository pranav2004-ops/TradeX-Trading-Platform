import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected error" };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, message: "" });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0d1117] px-4">
          <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-[#11161f] p-8 text-center">
            <p className="text-lg font-semibold text-[#f5f7fa]">Something went wrong</p>
            <p className="mt-2 text-sm text-[#8a93a3]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => this.handleReset()}
              className="mt-6 rounded-md bg-[#2f6fed] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#4a80ff]"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
