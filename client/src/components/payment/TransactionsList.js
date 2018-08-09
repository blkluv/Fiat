import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import FontAwesome from 'react-fontawesome';
import nem from 'nem-sdk';
import SingleTransaction from './SingleTransaction';
import Spinner from './../Spinner';
import '../../style/transactionsList.css';

const TransactionsList = props => {
  const {
    artistName,
    downloadToken,
    handleFetchIncomingTxs,
    isLoadingTxs,
    isUpdating,
    nemNode,
    paidToDate,
    price,
    releaseTitle,
    roundUp,
    toastInfo,
    transactions,
    transactionsError
  } = props;

  const downloadButton = downloadToken && (
    <Fragment>
      <h3 className="text-center mt-5">Thank you!</h3>
      <p className="text-center">
        <span className="ibm-type-italic">{releaseTitle}</span> has been added
        to <Link to={'/dashboard/collection'}>your collection</Link>.
      </p>
      <div className="d-flex justify-content-center">
        <button
          className="btn btn-outline-primary btn-lg download-button"
          download
          onClick={() => {
            toastInfo(`Fetching download: ${artistName} - '${releaseTitle}'`);
            window.location = `/api/download/${downloadToken}`;
          }}
        >
          <FontAwesome name="download" className="mr-2" />
          Download <span className="ibm-type-italic">{releaseTitle}</span>
        </button>
      </div>
    </Fragment>
  );

  const txList = transactions.map((tx, index) => (
    <SingleTransaction
      hash={tx.meta.hash.data}
      index={index}
      key={tx.meta.hash.data}
      amount={tx.transaction.amount / 10 ** 6}
      date={nem.utils.format.nemDate(tx.transaction.timeStamp)}
    />
  ));

  const renderError = (
    <div className="alert alert-danger text-center" role="alert">
      <FontAwesome name="bomb" className="mr-2" />
      Oh no! We encountered an error while checking for transactions:{' '}
      {transactionsError}
    </div>
  );

  const underpaid = () => {
    const delta = price - paidToDate;

    if (paidToDate > 0 && paidToDate < price && !downloadToken) {
      return (
        <p className="mb-4">
          Please pay a futher{' '}
          <span className="bold red">{roundUp(delta, 2).toFixed(2)} XEM</span>{' '}
          to activate your download, then tap the refresh button to check for
          confirmed payments.
        </p>
      );
    }
  };

  const confirmedTransactions = transactions.length > 0 && (
    <div className="tx-list mt-3">
      <h5 className="mb-4">
        <FontAwesome name="list-ol" className="red mr-3" />
        {transactions.length} Confirmed Transaction{transactions.length > 1 &&
          's'}:
      </h5>
      <table className="table table-sm table-striped table-dark mb-5">
        <thead>
          <tr>
            <th scope="col" className="col-item">
              #
            </th>
            <th scope="col" className="col-date">
              Payment Date
            </th>
            <th scope="col" className="col-amount">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>{txList}</tbody>
        <tfoot>
          <tr>
            <td colSpan="3">
              Note: Very recent transactions may not yet be visible on the
              explorer.
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  if (isLoadingTxs) {
    return (
      <Spinner>
        <h3 className="transactions-searching">
          <FontAwesome name="search" className="red mr-2" />
          Searching for Transactions&hellip;
        </h3>
      </Spinner>
    );
  }

  return (
    <Fragment>
      <div className="row">
        <div className="col">
          <h3 className="text-center">Transactions</h3>
        </div>
      </div>
      <div className="row transactions justify-content-center mb-5">
        <div className="segment col-md-6 p-4">
          {!transactions.length ? (
            <p className="mb-4">
              No transactions found just yet. Please hit the refresh button to
              check again for confirmed payments.
            </p>
          ) : (
            <p className="text-center">
              Paid to date:{' '}
              <span className="bold red">{paidToDate.toFixed(2)} XEM</span>
            </p>
          )}
          {underpaid()}
          <div className="d-flex justify-content-center">
            <button
              className="btn btn-outline-primary btn-sm refresh-txs py-2 px-3"
              disabled={isUpdating}
              onClick={() => handleFetchIncomingTxs(true)}
              title={`Press to check again for recent payments (NIS Node: ${nemNode}).`}
            >
              <FontAwesome name="refresh" className="mr-2" spin={isUpdating} />
              Refresh
            </button>
          </div>
          {downloadButton}
        </div>
      </div>
      <div className="row transactions">
        <div className="col">
          {transactionsError ? renderError : confirmedTransactions}
        </div>
      </div>
    </Fragment>
  );
};

export default TransactionsList;
