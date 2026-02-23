"use client";

import React from "react";

export function HeroNavIconGradient() {
	return (
		<svg
			aria-hidden="true"
			className="absolute h-0 w-0"
			focusable={false}
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<linearGradient
					id="hero-nav-icon-gradient"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="0%"
				>
					<stop offset="0%" stopColor="#818cf8" />
					<stop offset="50%" stopColor="#c084fc" />
					<stop offset="100%" stopColor="#818cf8" />
				</linearGradient>
			</defs>
		</svg>
	);
}
