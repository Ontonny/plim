import React from 'react';
import { Cell, Column, JSONFormat, Table, Table2 } from "@blueprintjs/table";
import { usePlansStore } from '../store';
import { EntityTitle, H5 } from '@blueprintjs/core';
interface LogsTableProps {
}

const LogsTable: React.FC<any> = () => {
    const { logList, settings } = usePlansStore();

    const renderCell = (rowIndex: number, columnIndex: number) => {
        const row = logList[logList.length - 1 - rowIndex];
        
        switch (columnIndex) {
          case 0:
            return <Cell>{row.date}</Cell>;
          case 1:
            return <Cell>{row.planName}</Cell>;
          case 2:
            return <Cell><a href={row.pipelineUrl}>{row.pipelineUrl}</a></Cell>;
          case 3:
            return <Cell><JSONFormat detectTruncation={true}>{JSON.stringify(row.json)}</JSONFormat></Cell>;
          default:
            return <Cell>Unknown</Cell>;
        }
      };

    return (
        <div>
          <EntityTitle icon={"th-list"} title={"View Logs"} heading={ H5 } subtitle={"Here you can view local logs"}></EntityTitle>
            <Table2 numRows={logList.length} columnWidths={[220,180,300,200]} measureByApproxOptions={{

      rowHeight: 40,
      columnPadding: 10,
    }}>
            {["Date", "Plan name", "Pipeline url", "JSON variables"].map((columnName, columnIndex) => (
              // reverse of rows index here
        <Column key={columnIndex} name={columnName} cellRenderer={(rowIndex) => renderCell(rowIndex, columnIndex)} />
      ))}
            </Table2>
        </div>
    );
};

export default LogsTable;