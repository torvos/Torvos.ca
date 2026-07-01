window.FileSystem = {

    "~": {
        type: "dir",
        children: {
            about: {
                type: "dir",
                children: {
                    bio: {
                        type: "file",
                        content: `
Torvos is a personal infrastructure and security-focused portfolio.

Specializing in:
- Cloud architecture (Azure, AWS)
- Identity & access management
- Infrastructure automation (Terraform)
- Secure system design`
                    }
                }
            },
            projects: {
                type: "dir",
                children: {
                    azure: {
                        type: "file",
                        content: "Azure IAM / Entra ID / federation / enterprise identity work."
                    },
                    terraform: {
                        type: "file",
                        content: "Infrastructure-as-code pipelines and multi-cloud deployments."
                    },
                    security: {
                        type: "file",
                        content: "Threat modeling, IAM design, and cloud security architecture."
                    }
                }
            },

            blog: {
                type: "dir",
                children: {
                    "welcome": {
                        type: "file",
                        content: "Welcome to the Torvos technical blog. More posts coming soon."
                    }
                }
            },

            contact: {
                type: "file",
                content: `
Email: contact@torvos.ca
GitHub: https://github.com/torvos
Bluesky: https://bsky.app/profile/torvos.bsky.social
LinkedIn: https://www.linkedin.com/in/philippet/`
            },

            resume: {
                type: "file",
                content: "Resume download available soon."
            }

        }

    }

};