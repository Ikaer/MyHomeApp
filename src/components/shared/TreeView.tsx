import React, { useState, ReactNode } from 'react';
import styles from './TreeView.module.css';

export interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNode[];
  isLeaf?: boolean;
  data?: any; // Additional data for the node
  path?: string; // Full path for files/folders
}

interface TreeViewProps {
  nodes: TreeNode[];
  onNodeSelect?: (node: TreeNode) => void;
  onNodeExpand?: (node: TreeNode, expanded: boolean) => void;
  selectedNodeId?: string;
  className?: string;
  showIcons?: boolean;
  expandedNodes?: Set<string>;
  defaultExpanded?: boolean;
}

interface TreeNodeProps {
  node: TreeNode;
  level: number;
  onSelect?: (node: TreeNode) => void;
  onExpand?: (node: TreeNode, expanded: boolean) => void;
  selectedNodeId?: string;
  showIcons?: boolean;
  expandedNodes: Set<string>;
  onExpandedChange: (nodeId: string, expanded: boolean) => void;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
  node,
  level,
  onSelect,
  onExpand,
  selectedNodeId,
  showIcons = true,
  expandedNodes,
  onExpandedChange
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpandable = hasChildren || (node.data && node.data.type === 'directory');
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpandable) {
      const newExpanded = !isExpanded;
      onExpandedChange(node.id, newExpanded);
      onExpand?.(node, newExpanded);
    }
  };

  const handleSelect = () => {
    onSelect?.(node);
  };

  const getNodeIcon = () => {
    if (node.icon) return node.icon;
    if (node.isLeaf) return '📄';
    return isExpanded ? '📂' : '📁';
  };

  const getExpandIcon = () => {
    if (!isExpandable) return <span className={styles.expandSpacer}></span>;
    return (
      <span 
        className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
        onClick={handleToggleExpand}
      >
        {isExpanded ? '▼' : '▶'}
      </span>
    );
  };

  return (
    <div className={styles.treeNode}>
      <div
        className={`${styles.treeNodeContent} ${isSelected ? styles.selected : ''}`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleSelect}
      >
        {getExpandIcon()}
        {showIcons && (
          <span className={styles.nodeIcon}>{getNodeIcon()}</span>
        )}
        <span className={styles.nodeLabel} title={node.path || node.label}>
          {node.label}
        </span>
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map(child => (
            <TreeNodeComponent
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onExpand={onExpand}
              selectedNodeId={selectedNodeId}
              showIcons={showIcons}
              expandedNodes={expandedNodes}
              onExpandedChange={onExpandedChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  onNodeSelect,
  onNodeExpand,
  selectedNodeId,
  className = '',
  showIcons = true,
  expandedNodes: controlledExpandedNodes,
  defaultExpanded = false
}) => {
  const [internalExpandedNodes, setInternalExpandedNodes] = useState<Set<string>>(() => {
    if (controlledExpandedNodes) return controlledExpandedNodes;
    
    const expanded = new Set<string>();
    if (defaultExpanded) {
      const addAllIds = (nodeList: TreeNode[]) => {
        nodeList.forEach(node => {
          if (node.children && node.children.length > 0) {
            expanded.add(node.id);
            addAllIds(node.children);
          }
        });
      };
      addAllIds(nodes);
    }
    return expanded;
  });

  const expandedNodes = controlledExpandedNodes || internalExpandedNodes;

  const handleExpandedChange = (nodeId: string, expanded: boolean) => {
    if (controlledExpandedNodes) {
      // Controlled mode - parent handles expansion
      return;
    }
    
    setInternalExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(nodeId);
      } else {
        newSet.delete(nodeId);
      }
      return newSet;
    });
  };

  return (
    <div className={`${styles.treeView} ${className}`}>
      {nodes.map(node => (
        <TreeNodeComponent
          key={node.id}
          node={node}
          level={0}
          onSelect={onNodeSelect}
          onExpand={onNodeExpand}
          selectedNodeId={selectedNodeId}
          showIcons={showIcons}
          expandedNodes={expandedNodes}
          onExpandedChange={handleExpandedChange}
        />
      ))}
    </div>
  );
};

export default TreeView;

// Utility function to build tree from flat path list
export const buildTreeFromPaths = (paths: string[], pathSeparator: string = '/'): TreeNode[] => {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  paths.forEach(path => {
    const parts = path.split(pathSeparator).filter(Boolean);
    let currentPath = '';
    let currentLevel = root;

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}${pathSeparator}${part}` : part;
      const isLeaf = index === parts.length - 1;
      
      let node = nodeMap.get(currentPath);
      if (!node) {
        node = {
          id: currentPath,
          label: part,
          path: currentPath,
          isLeaf,
          children: isLeaf ? undefined : []
        };
        nodeMap.set(currentPath, node);
        currentLevel.push(node);
      }
      
      if (!isLeaf) {
        currentLevel = node.children!;
      }
    });
  });

  return root;
};

