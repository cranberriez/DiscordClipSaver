import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import { SectionLayout } from "./SectionLayout";

export function FaqSection() {
	return (
		<SectionLayout>
			<div className="flex flex-col items-center gap-12 md:gap-16">
				<div className="max-w-2xl space-y-5 px-4 text-center">
					<div className="space-y-3">
						<div className="text-[11px] font-bold tracking-[0.2em] text-indigo-500 uppercase">
							SUPPORT
						</div>
						<h3 className="text-3xl font-bold tracking-tight md:text-4xl md:leading-[1.15]">
							Frequently asked questions
						</h3>
					</div>
					<p className="text-[16px] text-zinc-400">
						Can&apos;t find what you&apos;re looking for?{" "}
						<Link
							href="/docs"
							className="text-zinc-300 transition-colors hover:text-white hover:underline"
						>
							Check the docs.
						</Link>
					</p>
				</div>

				<div className="mx-auto w-full max-w-3xl px-4">
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem
							value="item-1"
							className="border-white/5 py-1"
						>
							<AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline">
								What is and isn&apos;t considered a clip for the
								bot to index and display?
							</AccordionTrigger>
							<AccordionContent className="text-[15px] leading-relaxed text-zinc-400">
								Any file attachments in messages, adding a
								playable video file that shows the preview
								counts as an attached video. Links to external
								sources like YouTube aren&apos;t indexed or
								included in the list of clips. This may change
								in the future but will come with additional
								filtering options.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem
							value="item-2"
							className="border-white/5 py-1"
						>
							<AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline">
								What does it mean for a clip to be indexed?
							</AccordionTrigger>
							<AccordionContent className="text-[15px] leading-relaxed text-zinc-400">
								We store the message ID and the link to the file
								within Discord, updating it as it&apos;s
								requested. The only information related to the
								clip we store is that link, a thumbnail of the
								first frame, and any text included alongside the
								embedded file.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem
							value="item-3"
							className="border-white/5 py-1"
						>
							<AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline">
								Can I prevent my clips from being indexed?
							</AccordionTrigger>
							<AccordionContent className="text-[15px] leading-relaxed text-zinc-400">
								Yes! You can do this in bulk either server-wide
								or entirely account-wide. Clips can also be bulk
								removed using the delete my data feature (coming
								soon). This does not delete the entire record of
								the clip but removes the filename, URL, any
								message, and makes your clip entirely private.
								We need to hold onto the message ID within
								Discord to avoid rescanning and regenerating
								this information.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem
							value="item-4"
							className="border-white/5 py-1"
						>
							<AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline">
								What can I search by?
							</AccordionTrigger>
							<AccordionContent className="text-[15px] leading-relaxed text-zinc-400">
								Search and filter by channel, author,
								game/title, and date range. Use favorites and
								collections to group your best moments.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem
							value="item-5"
							className="border-white/5 py-1"
						>
							<AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline">
								What permissions does the bot need?
							</AccordionTrigger>
							<AccordionContent className="text-[15px] leading-relaxed text-zinc-400">
								The bot only needs permission to read messages
								and message history in the channels you want to
								index. It does not need administrative
								privileges.
							</AccordionContent>
						</AccordionItem>

						<AccordionItem
							value="item-6"
							className="border-white/5 py-1"
						>
							<AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline">
								Is Guild Moments affiliated with or endorsed by
								Discord?
							</AccordionTrigger>
							<AccordionContent className="text-[15px] leading-relaxed text-zinc-400">
								No. Guild Moments is an independent product that
								works with Discord servers via a bot
								integration.
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</div>
		</SectionLayout>
	);
}
