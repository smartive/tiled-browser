import { ButtonHTMLAttributes } from "react";

export const Button = (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`p-1 focus:outline-none ${props.className || ""}`}
  />
);

export const AddressBarButton = (
  props: ButtonHTMLAttributes<HTMLButtonElement>
) => (
  <Button
    {...props}
    className={`border border-transparent disabled:text-gray-400 disabled:cursor-default ${
      props.className || ""
    } `}
  />
);
