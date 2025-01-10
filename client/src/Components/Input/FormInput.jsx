import { Field } from "formik";
import PropTypes from 'prop-types';

const FormInput = ({
  name,
  label,
  type,
  onChange,
  required,
  ...props
}) => {
  return (
    <div>
      <Field name={name}>
        {({ field, meta }) => (
          <div>
            <label
              htmlFor={name}
              className="mb-2.5 block font-medium text-black dark:text-white"
            >
              {label}
              {required ? <span style={{ color: "red" }}>*</span> : null}
            </label>
            <input
              {...field}
              {...props}
              id={name}
              value={field.value}
              type={type}
              onChange={onChange ? onChange : field.onChange}
              className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
            {meta.touched && meta.error ? (
              <div style={{ color: "red" }}>{meta.error}</div>
            ) : null}
          </div>
        )}
      </Field>
    </div>
  );
};

// Prop Types Validation
FormInput.propTypes = {
  name: PropTypes.string.isRequired, // Expecting a string for the input name
  label: PropTypes.string.isRequired, // Expecting a string for the label
  type: PropTypes.string, // Expecting a string for the input type (optional)
  onChange: PropTypes.func, // Expecting a function for onChange (optional)
  required: PropTypes.bool, // Expecting a boolean for required (optional)
};

export default FormInput;