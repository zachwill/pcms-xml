import React from 'react';
import { Form as BaseForm } from '@base-ui/react/form';
import { cx } from '@/lib/utils';

// Re-export Form types
type FormErrors = BaseForm.Props['errors'];
type FormValues = Record<string, unknown>;

interface FormProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseForm>, 'className'> {
  className?: string;
}

/**
 * Form component built on Base UI's Form primitive.
 *
 * Provides consolidated error handling for form fields.
 * Use with Field components for complete form validation.
 *
 * @example
 * ```tsx
 * const [errors, setErrors] = useState({});
 *
 * <Form
 *   errors={errors}
 *   onSubmit={async (e) => {
 *     e.preventDefault();
 *     const formData = new FormData(e.currentTarget);
 *     const response = await submitForm(formData);
 *     setErrors(response.errors);
 *   }}
 * >
 *   <Field name="email">
 *     <FieldLabel>Email</FieldLabel>
 *     <FieldControl type="email" required />
 *     <FieldError />
 *   </Field>
 *   <Button type="submit">Submit</Button>
 * </Form>
 * ```
 */
const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, children, ...props }, forwardedRef) => (
    <BaseForm
      ref={forwardedRef}
      className={cx('flex flex-col gap-4', className)}
      {...props}
    >
      {children}
    </BaseForm>
  ),
);
Form.displayName = 'Form';

export { Form };
export type { FormProps, FormErrors, FormValues };
