import { Component, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error(error)
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="This screen could not load"
          message="Please try again. Your saved shop data is still in this browser."
          onRetry={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}
