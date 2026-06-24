import React from 'react';
import { useUser } from '../contexts/UserContext';

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: '1rem',
  color: 'var(--text-color)',
};

const cellStyle = {
  border: '1px solid var(--border-color)',
  padding: '0.5rem',
};

export const BaseReport = ({ children, onSave }) => {
  const user = useUser();

  const basic = {
    employeeName: user?.name || '',
    employeeId: user?.employeeId || '',
    department: user?.department || '',
    designation: user?.designation || '',
    shiftTiming: user?.shiftTiming || '',
    reportingTo: user?.reportingManager || '',
    preparedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  return (
    <div className="base-report">
      <table style={tableStyle}>
        <tbody>
          <tr>
            <td style={cellStyle}><strong>Employee Name</strong></td>
            <td style={cellStyle}>{basic.employeeName}</td>
            <td style={cellStyle}><strong>Employee ID</strong></td>
            <td style={cellStyle}>{basic.employeeId}</td>
          </tr>
          <tr>
            <td style={cellStyle}><strong>Department</strong></td>
            <td style={cellStyle}>{basic.department}</td>
            <td style={cellStyle}><strong>Designation</strong></td>
            <td style={cellStyle}>{basic.designation}</td>
          </tr>
          <tr>
            <td style={cellStyle}><strong>Shift Timing</strong></td>
            <td style={cellStyle}>{basic.shiftTiming}</td>
            <td style={cellStyle}><strong>Reporting To</strong></td>
            <td style={cellStyle}>{basic.reportingTo}</td>
          </tr>
          <tr>
            <td style={cellStyle}><strong>Prepared Time</strong></td>
            <td style={cellStyle} colSpan={3}>{basic.preparedTime}</td>
          </tr>
        </tbody>
      </table>
      {children}
      <div style={{ textAlign: 'right', marginTop: '1rem' }}>
        <button onClick={onSave} className="save-btn" style={{ padding: '0.5rem 1rem', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '4px' }}>Save</button>
      </div>
    </div>
  );
};
