import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AccountingLayout from './AccountingLayout';
import AccountingDashboard from './AccountingDashboard';
import IncomeManagement from './IncomeManagement';
import ExpenseManagement from './ExpenseManagement';
import PurchaseManagement from './PurchaseManagement';
import InvoiceManagement from './InvoiceManagement';
import SalaryManagement from '../payroll/SalaryManagement';
import SalarySlips from '../payroll/SalarySlips';
import SalaryReports from '../payroll/SalaryReports';
import FinancialReports from './FinancialReports';

const AccountingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AccountingDashboard />;
      case 'income':
        return <IncomeManagement />;
      case 'expenses':
        return <ExpenseManagement />;
      case 'purchases':
        return <PurchaseManagement />;
      case 'invoices':
        return <InvoiceManagement />;
      case 'salaries':
        return <SalaryManagement />;
      case 'slips':
        return <SalarySlips />;
      case 'salaryReports':
        return <SalaryReports />;
      case 'financialReports':
        return <FinancialReports />;
      default:
        return <AccountingDashboard />;
    }
  };

  return (
    <AccountingLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AccountingLayout>
  );
};

export default AccountingPage;
