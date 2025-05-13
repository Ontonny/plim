import { Tree, TreeNodeInfo, Icon, FormGroup, EntityTitle, H5 } from '@blueprintjs/core';
import { useEffect, useState } from 'react';
import { usePlansStore } from '../store';

const TreePage: React.FC = () => {
const { planList, getPlanList } = usePlansStore();

useEffect(() => {
  getPlanList();
}, []);

const formatTreeData = (data: any[]): TreeNodeInfo[] => {
  return data.map(item => {
    // Initialize the base tree structure for each item
    const treeNode: TreeNodeInfo = {
      id: item.planName,
      label: (<span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Icon icon="folder-open" style={{ marginRight: 8 }} />
        {item.planName}
      </span>),
      hasCaret: true,
      isExpanded: false,
      childNodes: [],
    };

    // Conditionally add child nodes for each section if it exists
    if (item.ansible) {
      treeNode.childNodes.push({
        id: `ansible-${item.planName}`,
        label: (<span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Icon icon="playbook" style={{ marginRight: 8 }} />
          Ansible Config
        </span>),
        hasCaret: true,
        isExpanded: false,
        childNodes: Object.entries(item.ansible).map(([key, value]) => ({
          id: `ansible-${key}-${item.planName}`,
          label: `${key}: ${value ? JSON.stringify(value) : 'null'}`,
        })),
      });
    }

    if (item.gitlab) {
      treeNode.childNodes.push({
        id: `gitlab-${item.planName}`,
        label: (<span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Icon icon="server" style={{ marginRight: 8 }} />
          GitLab Config
        </span>),
        hasCaret: true,
        isExpanded: false,
        childNodes: Object.entries(item.gitlab).map(([key, value]) => ({
          id: `gitlab-${key}-${item.planName}`,
          label: `${key}: ${value ? JSON.stringify(value) : 'null'}`,
        })),
      });
    }

    if (item.groups && item.groups.length > 0) {
      treeNode.childNodes.push({
        id: `groups-${item.planName}`,
        label: (<span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Icon icon="inherited-group" style={{ marginRight: 8 }} />
          Groups
        </span>),
        hasCaret: true,
        isExpanded: false,
        childNodes: item.groups.map((group: string) => ({
          id: `group-${group}-${item.planName}`,
          label: `Group: ${group}`,
        })),
      });
    }

    if (item.views && item.views.length > 0) {
      treeNode.childNodes.push({
        id: `views-${item.planName}`,
        label: (<span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Icon icon="style" style={{ marginRight: 8 }} />
          Views
        </span>),
        hasCaret: true,
        isExpanded: false,
        childNodes: item.views.map((view: any) => ({
          id: `view-${view.key}-${item.planName}`,
          label: `${view.text}: ${view.value}`,
        })),
      });
    }

    return treeNode;
  });
};


const [treeData, setTreeData] = useState<TreeNodeInfo[]>(formatTreeData(planList));

const handleNodeClick = (nodeData: TreeNodeInfo) => {
  const updatedTreeData = [...treeData];
  const toggleNodeExpansion = (node: TreeNodeInfo) => {
    if (node.id === nodeData.id) {
      node.isExpanded = !node.isExpanded;
    }
    if (node.childNodes) {
      node.childNodes.forEach(toggleNodeExpansion);
    }
  };
  updatedTreeData.forEach(toggleNodeExpansion);
  setTreeData(updatedTreeData);
};

useEffect(() => {
}, []);
  return (
    <div className="bp5-dark">
      <EntityTitle icon={"diagram-tree"} title={"Plans tree"} heading={ H5 } subtitle={"Here you can view plans tree"}></EntityTitle>
      <br/>
      <FormGroup  label="current user groups:" labelFor="Plans tree" labelInfo="click to expand tree to see plans configuration">
        <Tree contents={treeData} onNodeClick={handleNodeClick} />
      </FormGroup>
    </div>
  );
};

export default TreePage;