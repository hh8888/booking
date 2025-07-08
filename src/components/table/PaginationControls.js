import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const PaginationControls = ({
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    startRecord,
    endRecord,
    totalRecords,
  }) => {
    const { t } = useLanguage();
    const handlePageSizeChange = (e) => {
      const newPageSize = Number(e.target.value);
      setPageSize(newPageSize);
      // Reset to first page when changing rows per page
      setCurrentPage(1);
    };

    return (
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-3 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div>
            <span className="mr-2 text-sm md:text-base">{t('common.rowsPerPage')}</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
          <div className="text-sm md:text-base text-gray-600">
            {t('common.rowTotal', { start: startRecord, end: endRecord, total: totalRecords })}
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg mr-2 min-w-[80px] md:min-w-[100px] text-sm md:text-base ${currentPage === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            {t('common.previous')}
          </button>
          <span className="mx-2 md:mx-4 text-sm md:text-base">
            {t('common.page', { current: currentPage, total: totalPages })}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg min-w-[80px] md:min-w-[100px] text-sm md:text-base ${currentPage === totalPages ? 'bg-gray-200 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            {t('common.next')}
          </button>
        </div>
      </div>
    );
  };

  export default PaginationControls;