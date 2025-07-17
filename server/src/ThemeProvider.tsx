import { createContext, ReactNode, useContext } from "react";

interface AppTheme {
  grid: {
    cell: string;
    section: string;
  };
  text: {
    primary: string;
    secondary: string;
    type: string;
  };
  node: {
    background: string;
    backgroundHover: string;
    border: string;
    divider: string;
  };
  connection: {
    line: string;
    start: string;
    end: string;
  };
}

export const gruvboxTheme: AppTheme = {
  grid: {
    cell: "#3c3836",
    section: "#504945",
  },
  text: {
    primary: "#ebdbb2",
    secondary: "#a89984",
    type: "#d65d0e",
  },
  node: {
    background: "#282828",
    backgroundHover: "#504945",
    border: "#504945",
    divider: "#4a4a5a",
  },
  connection: {
    line: "#a89984",
    start: "#689d6a",
    end: "#d79921",
  },
};

const ThemeContext = createContext(gruvboxTheme);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme called outside of ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return <ThemeContext.Provider value={gruvboxTheme}>{children}</ThemeContext.Provider>;
};
