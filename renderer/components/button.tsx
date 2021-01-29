import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: ButtonHTMLAttributes<HTMLButtonElement>;
  shortcut: string | null;
  size?: "sm" | "normal";
};

export const Button = ({ size = "sm", ...props }: ButtonProps) => (
  <button
    {...props}
    className={`${
      size === "sm" ? "w-4 h-4 text-sm" : "w-6 h-6 text-base"
    } items-center justify-center flex focus:outline-none ${
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
