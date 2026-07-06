    window.FileSystem = {

    "~": {
        type: "dir",
        children: {
            about: {
                type: "dir",
                children: {
                    "bio.md": {
                        type: "file",
                        content: `Bio comming soon, for now just look at linkedIn or find me on Slack/Discord.`
                    }
                }
            },

            blog: {
                type: "dir",
                children: {
                    "welcome.md": {
                        type: "file",
                        content: "Welcome... I'll write something at some point once I've finished this."
                    }
                }
            },

            "contact.md": {
                type: "file",
                content: `Email: contact@torvos.ca
GitHub: https://github.com/torvos
Bluesky: https://bsky.app/profile/torvos.bsky.social
LinkedIn: https://www.linkedin.com/in/philippet/`
            },

            "resume.md": {
                type: "file",
                content: "Resume download available soon, check linkedIn for now."
            }

        }

    }

};