import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: ButtonHTMLAttributes<HTMLButtonElement>;
  shortcut: string | null;
  size?: "lg";
};

export const Button = ({ size, ...props }: ButtonProps) => (
  <button
    {...props}
    className={`p-${size === "lg" ? "2" : "1"} focus:outline-none ${
      props.className || ""
    }`}
    title={`${props.title}${props.shortcut ? ` (${props.shortcut})` : ""}`}
  />
);

export const AddressBarButton = (props: ButtonProps) => (
  <Button
    {...props}
    className={`border border-transparent disabled:text-gray-400 disabled:cursor-default ${
      props.className || ""
    } `}
  />
);
