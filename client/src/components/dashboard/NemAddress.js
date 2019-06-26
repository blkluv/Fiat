import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { Field, reduxForm } from 'redux-form';
import FontAwesome from 'react-fontawesome';
import nem from 'nem-sdk';
import { addNemAddress, toastSuccess, toastWarning } from '../../actions';

const addressPrefix =
  process.env.REACT_APP_NEM_NETWORK === 'mainnet' ? "an 'N'" : "a 'T'";

class Dashboard extends Component {
  componentDidMount() {
    this.props.initialize({
      nemAddress: nem.utils.format.address(this.props.nemAddress)
    });
  }

  onSubmit = values => {
    this.props.addNemAddress(values).then(res => {
      if (res.error) return;

      if (!values.nemAddress) {
        this.props.toastWarning('NEM payment address removed.');
      } else {
        this.props.toastSuccess('NEM payment address saved.');
      }
    });
  };

  checkNemAddress = address => {
    if (address && !nem.model.address.isValid(address)) {
      return (
        <Fragment>
          <FontAwesome name="exclamation-circle" className="mr-2" />
          This doesn&rsquo;t appear to be a valid NEM address. Please
          double-check it!
        </Fragment>
      );
    }
    return undefined;
  };

  renderNemAddressField = ({
    hint,
    id,
    input,
    label,
    name,
    placeholder,
    type,
    meta: { active, error, touched }
  }) => {
    const className = `form-group ${
      !active && touched && error ? 'invalid' : ''
    }`;
    return (
      <div className={className}>
        <label htmlFor={id}>{label}</label>
        {id === 'nemAddress' && this.renderAddressStatus()}
        <input
          {...input}
          className="form-control payment-address"
          name={name}
          placeholder={placeholder}
          type={type}
        />
        <small className="form-text text-muted">{hint}</small>
        <div className="invalid-feedback">{touched && error && error}</div>
      </div>
    );
  };

  renderAddressStatus = () => {
    const { nemAddress, nemAddressVerified } = this.props;

    if (nemAddress && !nemAddressVerified) {
      return (
        <span
          className="status unconfirmed"
          title="Thank you for verifying your address."
        >
          Unverified
          <FontAwesome name="exclamation-circle" className="ml-2" />
        </span>
      );
    }

    if (nemAddress && nemAddressVerified) {
      return (
        <span className="status confirmed">
          Verified
          <FontAwesome name="check-circle" className="ml-2" />
        </span>
      );
    }
  };

  renderConfirmAddressField = () => {
    const { nemAddress, nemAddressVerified, submitting } = this.props;

    if (nemAddress && !nemAddressVerified) {
      return (
        <Fragment>
          <Field
            disabled={submitting}
            hint="This address has not yet been confirmed."
            id="signedMessage"
            label="Your Signed Message"
            name="signedMessage"
            type="text"
            component={this.renderNemAddressField}
          />
          <p>
            Please create a signed message in the desktop wallet app (Services
            &#8594; Signed message &#8594; Create a signed message), and
            copy/paste the results here to verify ownership of your account.
          </p>
          <p>It doesn&rsquo;t matter what you put in the message field.</p>
          <p>
            Once you have verified your account, you can add credit and start
            selling your music!
          </p>
        </Fragment>
      );
    }
  };

  render() {
    const { handleSubmit, pristine, submitting, invalid } = this.props;

    return (
      <main className="container">
        <div className="row">
          <div className="col-lg mb-5 py-3">
            <h3 className="text-center mt-4">NEM Payment Address</h3>
            <p className="text-center">
              Please add a NEM address if you wish to sell music, as fan
              payments will be sent directly to this address.
            </p>
            <form
              className="nem-address my-5 py-5"
              onSubmit={handleSubmit(this.onSubmit)}
            >
              <div className="form-row">
                <div className="col-md-9 mx-auto">
                  <Field
                    disabled={submitting}
                    id="nemAddress"
                    hint="It doesn&rsquo;t matter whether you include dashes or not."
                    label="Your NEM Address"
                    name="nemAddress"
                    placeholder={`NEM Address (should start with ${addressPrefix})`}
                    type="text"
                    component={this.renderNemAddressField}
                    validate={this.checkNemAddress}
                  />
                  {this.renderConfirmAddressField()}
                  <div className="d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn btn-outline-primary btn-lg"
                      disabled={invalid || pristine || submitting}
                    >
                      Save Address
                    </button>
                  </div>
                </div>
              </div>
            </form>
            <h4>Getting Your First NEM Address</h4>
            <p>
              To receive payments from fans, as well as (eventually) utility
              tokens or rewards from NEMp3, you will need to have your own NEM
              address. The easiest way to do this is by setting up an account
              with one of the mobile wallets, which are available from your
              phone&rsquo;s respective download store, as linked from{' '}
              <a href="https://nem.io/downloads/">the NEM site</a>. Of course,
              there is a more fully-featured cross-platform desktop wallet also
              available.
            </p>
            <p>
              The mobile wallets are especially handy, as they are able to scan
              the QR codes on the payment pages using the device&rsquo;s camera,
              to fill in payment details automatically (which you can confirm
              before sending, naturally). This makes including the payment
              message code with your payment amount foolproof.
            </p>
            <p>
              Within any of the wallets, whether the desktop NanoWallet or the
              mobile wallets, you can create any number of accounts, each with
              their own individual address. You could easily dedicate an address
              to NEMp3, for instance.
            </p>
            <p>
              At present, only a single NEM address can be added to NEMp3
              accounts, so for example, automatic royalty splits are not yet
              possible (and would incur a network fee for royalties sent to each
              band member). This may change with the next update of the NEM
              infrastructure.
            </p>
          </div>
        </div>
      </main>
    );
  }
}

function mapStateToProps(state) {
  return {
    credit: state.user.credit,
    nemAddress: state.user.nemAddress,
    nemAddressVerified: state.user.nemAddressVerified
  };
}

export default reduxForm({
  form: 'nemAddressForm'
})(
  connect(
    mapStateToProps,
    { addNemAddress, toastSuccess, toastWarning }
  )(Dashboard)
);
