interface SpotifyLogoProps {
  size?: number;
  className?: string;
}

export function SpotifyLogo({ size = 24, className = "" }: SpotifyLogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="12" fill="#1DB954"/>
      <g fill="white">
        {/* Top line - longest */}
        <path 
          d="M6 10.5C6 10.5 9 8.5 12 8.5C15 8.5 18 10.5 18 10.5V11.5C18 11.5 15 9.5 12 9.5C9 9.5 6 11.5 6 11.5V10.5Z" 
          fill="white"
        />
        {/* Middle line - medium */}
        <path 
          d="M6 13C6 13 9 11 12 11C15 11 18 13 18 13V14C18 14 15 12 12 12C9 12 6 14 6 14V13Z" 
          fill="white"
        />
        {/* Bottom line - shortest */}
        <path 
          d="M6 15.5C6 15.5 9 13.5 12 13.5C15 13.5 18 15.5 18 15.5V16.5C18 16.5 15 14.5 12 14.5C9 14.5 6 16.5 6 16.5V15.5Z" 
          fill="white"
        />
      </g>
    </svg>
  );
}




