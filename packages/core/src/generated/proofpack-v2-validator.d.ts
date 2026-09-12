import type { ErrorObject } from "ajv";

declare const validate: {
  (value: unknown): boolean;
  errors?: ErrorObject[] | null;
};

export default validate;
