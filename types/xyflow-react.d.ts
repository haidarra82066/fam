declare module '@xyflow/react' {
  import * as React from 'react';
  export type Node = any;
  export type Edge = any;
  export const Background: React.ComponentType<any>;
  export const Controls: React.ComponentType<any>;
  export const MiniMap: React.ComponentType<any>;
  export const ReactFlowProvider: React.ComponentType<any>;
  export function useReactFlow(): any;
  const ReactFlow: React.ComponentType<any>;
  export default ReactFlow;
}
