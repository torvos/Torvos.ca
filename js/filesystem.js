    window.FileSystem = {

    "/": {
        type: "dir",
        hidden: false,
        children: {
            home: {
                type: "dir",
                hidden: false,
                children: {
                    guest:{
                        type: "dir",
                        hidden: false,
                        children: {
                            about: {
                                type: "dir",
                                hidden: false,
                                children: {
                                    "bio.md": {
                                        type: "file",
                                        hidden: false,
                                        content: `+------------------------------------------------------------------------------------------+
| Senior cloud architecture and cybersecurity leader with more than 23 years of            |
| experience delivering enterprise technology solutions. Recognized for leading cloud      | 
| modernization initiatives, establishing enterprise architecture and security strategies, |
| building high-performing technical teams, and advising executives on cloud adoption,     |
| cybersecurity, DevSecOps, and digital transformation.                                    |
+------------------------------------------------------------------------------------------+`}
                                }
                            },
                            "contact.md": {
                                type: "file",
                                hidden: false,                
                                content: `+--------------------------------------------------------+
| - Email: contact@torvos.ca                             |
| - GitHub: https://github.com/torvos                    |
| - Bluesky: https://bsky.app/profile/torvos.bsky.social |
+--------------------------------------------------------+`},
                            "resume.md": {
                                type: "file",
                                hidden: false,                
                                content: "Resume download available soon, check linkedIn for now."
                            },
                            ".hidden.md": {
                                type: "file",
                                hidden: true,
                                content: "Hidden file"
                            }                            
                        }
                    }
                }
            }
        }
    }
};