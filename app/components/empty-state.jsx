// eslint-disable-next-line react/prop-types
export default function EmptyState({ title, text, link, label }) {
    return (
        <s-section accessibilityLabel="Empty state section">
            <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
                <s-box maxInlineSize="200px" maxBlockSize="200px">
                    <s-image
                        aspectRatio="1/0.5"
                        src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        alt="A stylized graphic representing product tagging rules"
                    />
                </s-box>

                <s-grid justifyItems="center" maxBlockSize="450px" maxInlineSize="450px">
                    <s-heading>{title}</s-heading>

                    <s-paragraph>
                        <p className="text-center">
                            {text}
                        </p>
                    </s-paragraph>

                    {link && label && (
                        <s-stack
                            gap="small-200"
                            justifyContent="center"
                            padding="base"
                            paddingBlockEnd="none"
                            direction="inline"
                        >
                            <s-button href={link} variant="primary">
                                {label}
                            </s-button>
                        </s-stack>
                    )}
                </s-grid>
            </s-grid>
        </s-section>
    );
}
