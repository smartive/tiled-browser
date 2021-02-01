import { useRef } from "react";
import { FaFileImport } from "react-icons/fa";
import { useAppState } from "../hooks/context";
import { Button } from "./button";

export const Import = () => {
  const inputRef = useRef<HTMLInputElement>();

  const [, setState] = useAppState();

  return (
    <Button
      size="normal"
      title="Import Settings"
      shortcut={null}
      onClick={() => inputRef.current.click()}
    >
      <FaFileImport />
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        onChange={(e) => {
          if (!e.target.files.length) {
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target.result as string;
            if (!result.startsWith("data:application/json;base64,")) {
              throw new Error("Unknown format");
            }
            const newState = JSON.parse(atob(result.substring(29)));
            if (!confirm("Overwrite your current browser state?")) {
              return;
            }
            setState((state) => Object.assign(state, newState));
          };
          reader.readAsDataURL(e.target.files[0]);
        }}
      />
    </Button>
  );
};
