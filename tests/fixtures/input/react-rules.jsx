// Test React/JSX linting rules
import React from 'react';

// react/jsx-key - missing key in array
function ListComponent() {
  const items = [1, 2, 3];
  return (
    <ul>
      {items.map(item => (
        <li>{item}</li>
      ))}
    </ul>
  );
}

// react/no-unused-state
class ComponentWithUnusedState extends React.Component {
  state = {
    unused: 'never used',
    used: 'this is used'
  };

  render() {
    return <div>{this.state.used}</div>;
  }
}

// react/jsx-no-duplicate-props
function DuplicateProps() {
  return <div className="test" className="duplicate" />;
}

// react/no-direct-mutation-state
class MutatingComponent extends React.Component {
  handleClick = () => {
    this.state.value = 'mutated'; // should use setState
  };

  render() {
    return <button onClick={this.handleClick}>Click</button>;
  }
}

// react/jsx-uses-vars - unused React import
// (React is imported but might be flagged if not used in JSX)

export { ListComponent, ComponentWithUnusedState, DuplicateProps, MutatingComponent };
