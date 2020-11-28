import { Field, reduxForm } from 'redux-form';
import React, { useRef } from 'react';
import { faComment, faEnvelope } from '@fortawesome/free-regular-svg-icons';
import { toastError, toastSuccess } from 'features/toast';
import Button from 'components/button';
import { Helmet } from 'react-helmet';
import InputField from 'components/inputField';
import PropTypes from 'prop-types';
import RenderRecaptcha from 'components/renderRecaptcha';
import axios from 'axios';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useDispatch } from 'react-redux';

const Contact = ({ handleSubmit, invalid, pristine, reset, submitting }) => {
  const dispatch = useDispatch();
  const captchaRef = useRef();

  const onSubmit = async values => {
    try {
      const res = await axios.post('/api/contact', values);
      reset();
      captchaRef.current.getRenderedComponent().reset();
      dispatch(toastSuccess(res.data.success));
    } catch (error) {
      dispatch(toastError(error.response.data.error));
    }
  };

  return (
    <main className="container">
      <Helmet>
        <title>Contact Us</title>
        <meta name="description" content="Get in touch with the nemp3 team." />
      </Helmet>
      <div className="row">
        <div className="col py-3 mb-4">
          <h2 className="text-center mt-4">Contact Us</h2>
          <p>
            Please get in touch using the contact form below if you have any queries, suggestions, or need help with
            anything. We&rsquo;ll be in touch as soon as possible.
          </p>
          <form className="form-row mt-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="col-md-6 mx-auto">
              <Field
                component={InputField}
                icon={faEnvelope}
                id="email"
                label="Email Address:"
                name="email"
                placeholder="Email Address"
                type="email"
                required
              />
              <Field
                component={InputField}
                icon={faComment}
                id="message"
                label="Your Message:"
                name="message"
                placeholder="Enter your message."
                rows="6"
                type="textarea"
                required
              />
              <Field
                component={RenderRecaptcha}
                classNames="justify-content-end"
                forwardRef
                name="recaptcha"
                ref={el => {
                  captchaRef.current = el;
                }}
              />
              <div className="d-flex justify-content-end">
                <Button className="my-3" icon={faCheck} type="submit" disabled={invalid || pristine || submitting}>
                  Send Message
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

const validate = values => {
  const errors = {};
  if (!values.email) errors.email = 'Please enter your email address.';
  if (!values.message) errors.message = 'Please enter a message.';
  if (!values.recaptcha) errors.recaptcha = 'Please complete the recaptcha.';
  return errors;
};

Contact.propTypes = {
  handleSubmit: PropTypes.func,
  invalid: PropTypes.bool,
  pristine: PropTypes.bool,
  reset: PropTypes.func,
  submitting: PropTypes.bool
};

export default reduxForm({ form: 'contactForm', validate })(Contact);
