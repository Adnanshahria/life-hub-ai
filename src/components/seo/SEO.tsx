import { Helmet } from "react-helmet-async";

interface SEOProps {
    title: string;
    description?: string;
    image?: string;
    url?: string;
    keywords?: string[];
    author?: string;
    noindex?: boolean;
}

export function SEO({
    title,
    description,
    image,
    url,
    keywords = ["LifeOS", "Productivity", "Finance", "Tasks", "Habits", "AI", "Personal Dashboard"],
    author = "Adnan Shahria",
    noindex = false
}: SEOProps) {
    const siteTitle = "LifeOS - Your Personal Operating System";
    const siteDescription = "A comprehensive life management system with AI integration. Track your finances, habits, tasks, and studies in one premium dashboard.";
    const siteUrl = window.location.origin;
    const currentUrl = url || window.location.href;

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{title} | LifeOS</title>
            <meta name="description" content={description || siteDescription} />
            <meta name="keywords" content={keywords.join(", ")} />
            <meta name="author" content={author} />
            <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
            <link rel="canonical" href={currentUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="LifeOS" />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description || siteDescription} />
            <meta property="og:locale" content="en_US" />
            {image && <meta property="og:image" content={image} />}

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:creator" content="@adnan_shahria" />
            <meta property="twitter:url" content={currentUrl} />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description || siteDescription} />
            {image && <meta property="twitter:image" content={image} />}

            {/* Theme & Mobile */}
            <meta name="theme-color" content="#000000" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        </Helmet>
    );
}
