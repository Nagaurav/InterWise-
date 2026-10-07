interface ResultTabBtnProps {
  onClick: () => void;
  activeTab: string;
  text: string;
  tabText: string;
}

const ResultTabBtn = ({
  onClick,
  activeTab,
  text,
  tabText,
}: ResultTabBtnProps) => {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 text-sm font-semibold rounded-full cursor-pointer transition-colors duration-300 ${
        activeTab === tabText
          ? "bg-[var(--theme-color)] text-white"
          : "text-zinc-400 hover:text-white"
      }`}
    >
      {text}
    </button>
  );
};

export default ResultTabBtn;
