<?php
// Custom users for the local dev/test Shibboleth (SAML) IdP, mounted into the
// kenchan0130/simplesamlphp container. Mirrors what RENATER/eduGAIN releases:
// a stable eduPersonPrincipalName plus email and name. Prod uses the real IdP;
// this only exists so the brokered login completes without prompts locally.
$config = array(
    'admin' => array(
        'core:AdminPassword',
    ),
    'example-userpass' => array(
        'exampleauth:UserPass',
        'user1:password' => array(
            'eduPersonPrincipalName' => array('mdupont@univ-lorraine.fr'),
            'email' => array('marie.dupont@univ-lorraine.fr'),
            'firstName' => array('Marie'),
            'lastName' => array('Dupont'),
        ),
        'user2:password' => array(
            'eduPersonPrincipalName' => array('jmartin@univ-lorraine.fr'),
            'email' => array('jean.martin@univ-lorraine.fr'),
            'firstName' => array('Jean'),
            'lastName' => array('Martin'),
        ),
    ),
);
