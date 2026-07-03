<?php
// Custom users for the local dev/test/preprod Shibboleth (SAML) IdP, mounted into
// the kenchan0130/simplesamlphp container. Mirrors what RENATER/eduGAIN releases:
// a stable eduPersonPrincipalName plus email and name. True prod uses the real
// IdP; this only exists so the brokered login completes without prompts.
//
// Login is firstname.lastname; every user shares one password taken from the
// KEYCLOAK_PASSWORD env var (falls back to `password` for dev/e2e), the same
// variable the Keycloak admin password uses.
$password = getenv('KEYCLOAK_PASSWORD') ?: 'password';

// login => [firstName, lastName, eduPersonPrincipalName local-part]. Email and
// login are firstname.lastname; the eppn keeps RENATER's initial+lastname shape.
$users = array(
    'marie.dupont'   => array('Marie',   'Dupont',  'mdupont'),
    'jean.martin'    => array('Jean',    'Martin',  'jmartin'),
    'sophie.bernard' => array('Sophie',  'Bernard', 'sbernard'),
    'pierre.durand'  => array('Pierre',  'Durand',  'pdurand'),
    'camille.petit'  => array('Camille', 'Petit',   'cpetit'),
    'luc.moreau'     => array('Luc',     'Moreau',  'lmoreau'),
);

$exampleUserpass = array('exampleauth:UserPass');
foreach ($users as $login => $info) {
    list($firstName, $lastName, $uid) = $info;
    $exampleUserpass["$login:$password"] = array(
        'eduPersonPrincipalName' => array("$uid@univ-lorraine.fr"),
        'email' => array("$login@univ-lorraine.fr"),
        'firstName' => array($firstName),
        'lastName' => array($lastName),
    );
}

$config = array(
    'admin' => array(
        'core:AdminPassword',
    ),
    'example-userpass' => $exampleUserpass,
);
