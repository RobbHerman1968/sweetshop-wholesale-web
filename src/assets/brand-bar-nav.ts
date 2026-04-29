export type BrandBarNavLink = {
    title: string;
    href: string;
    description: string;
};

export type BrandBarNavCategory = {
    label: string;
    description: string;
    links: BrandBarNavLink[];
};

export const brandBarNavCategories: BrandBarNavCategory[] = [
    {
        label: 'Gourmet Chocolates',
        description: 'Gourmet Chocolate Gifts',
        links: [
            { title: 'Gift sets', href: '/shop#gourmet-chocolates', description: 'Curated boxes for holidays and thank-yous.' },
            { title: 'Seasonal bestsellers', href: '/shop#gourmet-chocolates', description: 'What shops reorder every season.' },
            { title: 'Corporate gifting', href: '/shop#gourmet-chocolates', description: 'Volume pricing and custom messaging.' },
            { title: 'Build your own', href: '/shop#gourmet-chocolates', description: 'Mix SKUs to match your shelf plan.' },
        ],
    },
    {
        label: 'Handcrafted Clusters',
        description: 'Artisan Handcrafted Clusters',
        links: [
            { title: 'Almond clusters', href: '/shop#handcrafted-clusters', description: 'Crunchy nuts in milk or dark couverture.' },
            { title: 'Pecan turtles', href: '/shop#handcrafted-clusters', description: 'Classic caramel and pecan layers.' },
            { title: 'Mixed assortments', href: '/shop#handcrafted-clusters', description: 'Prepacked variety for grab-and-go.' },
            { title: 'Dark chocolate nuts', href: '/shop#handcrafted-clusters', description: 'Higher cacao, less sweet profile.' },
        ],
    },
    {
        label: 'Buttery Small-Batch Toffee',
        description: 'Buttery Small-Batch Toffee',
        links: [
            { title: 'English toffee', href: '/shop#buttery-small-batch-toffee', description: 'Buttery slab scored for easy retail.' },
            { title: 'Chocolate-covered toffee', href: '/shop#buttery-small-batch-toffee', description: 'Dipped pieces with long shelf appeal.' },
            { title: 'Nut brittle', href: '/shop#buttery-small-batch-toffee', description: 'Thin, snappy brittle with nut inclusions.' },
            { title: 'Gift tins', href: '/shop#buttery-small-batch-toffee', description: 'Stackable tins for counters and displays.' },
        ],
    },
];
